/**
 * Smart Ticket Clustering Service
 * Groups related tickets based on similarity (location, customer, infra, problem)
 * Auto-escalates when multiple tickets detected from same incident
 * Cascades resolution when master ticket is resolved
 */
export class TicketClusteringService {
    constructor(db, logger, opts = {}) {
        this.db = db;
        this.logger = logger;
        this.options = {
            windowMinutes: opts.windowMinutes ?? 60,
            similarityThreshold: opts.similarityThreshold ?? 0.75,
            minClusterSize: opts.minClusterSize ?? 2,
            maxMembersPerCluster: opts.maxMembersPerCluster ?? 50,
        };
    }
    /**
     * Main clustering logic: called when new ticket is created
     * 1. Search for recent tickets with similar attributes
     * 2. Calculate similarity scores
     * 3. If found similar: check if cluster already exists or create new
     * 4. Add as member to cluster
     * 5. Return cluster info for notification
     */
    async clusterNewTicket(ticket) {
        try {
            const since = new Date(Date.now() - this.options.windowMinutes * 60000);
            // Step 1: Find candidate tickets from same window
            const candidates = await this.db.ticket.findMany({
                where: {
                    createdAt: { gte: since },
                    id: { not: ticket.id },
                    status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] },
                },
                take: 50,
            });
            if (candidates.length === 0) {
                this.logger.debug('No candidate tickets for clustering', { ticketId: ticket.id });
                return { memberCount: 1, created: false };
            }
            // Step 2: Calculate similarity for each candidate
            const scored = candidates
                .map((candidate) => ({
                ticket: candidate,
                similarity: this.calculateSimilarity(ticket, candidate),
                factors: this.getMatchingFactors(ticket, candidate),
            }))
                .filter((s) => s.similarity >= this.options.similarityThreshold)
                .sort((a, b) => b.similarity - a.similarity);
            if (scored.length === 0) {
                this.logger.debug('No similar tickets found for clustering', { ticketId: ticket.id });
                return { memberCount: 1, created: false };
            }
            // Step 3: Check if any similar ticket is already in a cluster
            const topMatch = scored[0];
            const existingCluster = await this.db.ticketCluster.findFirst({
                where: {
                    masterTicketId: topMatch.ticket.id,
                },
                include: { members: true },
            });
            if (existingCluster) {
                // Add new ticket to existing cluster
                if (existingCluster.members.length < this.options.maxMembersPerCluster) {
                    await this.addMemberToCluster(existingCluster.id, ticket, topMatch.similarity, topMatch.factors);
                    this.logger.info('Ticket added to existing cluster', {
                        clusterId: existingCluster.id,
                        clusterNumber: existingCluster.clusterNumber,
                        memberCount: existingCluster.members.length + 1,
                    });
                    return {
                        clusterId: existingCluster.id,
                        clusterNumber: existingCluster.clusterNumber,
                        memberCount: existingCluster.members.length + 1,
                        created: false,
                    };
                }
            }
            // Step 4: Create new cluster if we have enough members
            if (scored.length >= this.options.minClusterSize - 1) {
                const cluster = await this.createCluster(ticket, scored);
                this.logger.info('New cluster created', {
                    clusterId: cluster.id,
                    clusterNumber: cluster.clusterNumber,
                    memberCount: cluster.members.length,
                });
                return {
                    clusterId: cluster.id,
                    clusterNumber: cluster.clusterNumber,
                    memberCount: cluster.members.length,
                    created: true,
                };
            }
            this.logger.debug('Not enough similar tickets to create cluster', {
                ticketId: ticket.id,
                similarCount: scored.length,
                threshold: this.options.minClusterSize,
            });
            return { memberCount: 1, created: false };
        }
        catch (error) {
            this.logger.error('Clustering failed', error, { ticketId: ticket.id });
            return { memberCount: 1, created: false };
        }
    }
    /**
     * When master ticket is resolved, cascade to cluster members
     */
    async cascadeResolution(ticketId, rootCause, solution, changedById) {
        try {
            // Find cluster where this ticket is the master
            const cluster = await this.db.ticketCluster.findFirst({
                where: { masterTicketId: ticketId, cascadeOnResolve: true },
                include: { members: { include: { ticket: true } } },
            });
            if (!cluster) {
                this.logger.debug('No cluster found for cascade (ticket not a master or cascade disabled)', { ticketId });
                return;
            }
            const memberIds = cluster.members.map((m) => m.ticketId);
            // Update all member tickets
            await this.db.ticket.updateMany({
                where: { id: { in: memberIds } },
                data: {
                    status: 'RESOLVED',
                    rootCause,
                    solution,
                    resolvedAt: new Date(),
                },
            });
            // Mark all members as resolved in cluster
            await this.db.ticketClusterMember.updateMany({
                where: { clusterId: cluster.id },
                data: { isResolved: true, resolvedAt: new Date() },
            });
            // Update cluster status
            await this.db.ticketCluster.update({
                where: { id: cluster.id },
                data: {
                    status: 'RESOLVED',
                    resolvedAt: new Date(),
                },
            });
            // Log to cluster history
            await this.db.ticketClusterHistory.create({
                data: {
                    clusterId: cluster.id,
                    action: 'resolved',
                    details: { cascaded: true, memberCount: memberIds.length },
                    changedBy: changedById,
                    note: `Cascaded resolution to ${memberIds.length} member tickets. Root Cause: ${rootCause}`,
                },
            });
            this.logger.info('Cascade resolution applied', { clusterId: cluster.id, ticketId, memberCount: memberIds.length });
        }
        catch (error) {
            this.logger.error('Cascade resolution failed', error, { ticketId });
            throw error;
        }
    }
    /**
     * Get cluster details for display/notification
     */
    async getClusterDetails(clusterId) {
        const cluster = await this.db.ticketCluster.findUnique({
            where: { id: clusterId },
            include: {
                masterTicket: true,
                members: { include: { ticket: true } },
                history: { orderBy: { createdAt: 'desc' }, take: 5 },
            },
        });
        if (!cluster)
            return null;
        return {
            clusterNumber: cluster.clusterNumber,
            clusterUrl: `http://localhost:4000/api/tickets/cluster/${clusterId}`,
            masterTicket: {
                number: cluster.masterTicket.ticketNumber,
                title: cluster.masterTicket.title,
                priority: cluster.masterTicket.priority,
                category: cluster.masterTicket.category,
            },
            summary: {
                affectedTickets: cluster.members.length,
                commonLocation: cluster.commonLocation,
                commonCustomer: cluster.commonCustomer,
                commonService: cluster.commonService,
                affectedAssets: cluster.affectedAssets,
                severity: cluster.severity,
                impactScore: cluster.impactScore,
            },
            members: cluster.members.map((m) => ({
                ticketNumber: m.ticket.ticketNumber,
                title: m.ticket.title,
                status: m.ticket.status,
                priority: m.ticket.priority,
                similarity: (m.similarityScore * 100).toFixed(0),
            })),
            timeline: {
                detectedAt: cluster.detectedAt,
                escalatedAt: cluster.escalatedAt,
                resolvedAt: cluster.resolvedAt,
            },
        };
    }
    /**
     * Similarity calculation algorithm
     * Weighted score from: location (0.3), customer (0.2), service (0.2), problem (0.2), priority (0.1)
     */
    calculateSimilarity(ticket1, ticket2) {
        const factors = {
            location: this.scoreMatch(ticket1.location, ticket2.location, 0.3),
            customer: this.scoreMatch(ticket1.customer, ticket2.customer, 0.2),
            service: this.scoreMatch(ticket1.service, ticket2.service, 0.2),
            problem: this.stringSimilarity(ticket1.problem, ticket2.problem) * 0.2,
            priority: this.priorityMatch(ticket1.priority, ticket2.priority) * 0.1,
        };
        return Math.min(1, factors.location + factors.customer + factors.service + factors.problem + factors.priority);
    }
    /**
     * Get matching factors for this specific pair
     */
    getMatchingFactors(ticket1, ticket2) {
        const factors = [];
        if (ticket1.location && ticket1.location === ticket2.location)
            factors.push('location');
        if (ticket1.customer && ticket1.customer === ticket2.customer)
            factors.push('customer');
        if (ticket1.service && ticket1.service === ticket2.service)
            factors.push('service');
        if (this.stringSimilarity(ticket1.problem, ticket2.problem) > 0.7)
            factors.push('problem');
        return factors;
    }
    /**
     * Exact match scoring
     */
    scoreMatch(value1, value2, weight) {
        if (!value1 || !value2)
            return 0;
        if (value1.toLocaleLowerCase() === value2.toLocaleLowerCase())
            return weight;
        return 0;
    }
    /**
     * Priority proximity scoring (e.g. HIGH vs CRITICAL is closer than HIGH vs LOW)
     */
    priorityMatch(priority1, priority2) {
        const priorityOrder = {
            LOW: 1,
            MEDIUM: 2,
            HIGH: 3,
            CRITICAL: 4,
        };
        const diff = Math.abs(priorityOrder[priority1] - priorityOrder[priority2]);
        if (diff === 0)
            return 1;
        if (diff === 1)
            return 0.7;
        if (diff === 2)
            return 0.4;
        return 0;
    }
    /**
     * Levenshtein-inspired string similarity for problem field
     * Returns 0-1 score
     */
    stringSimilarity(str1, str2) {
        if (!str1 || !str2)
            return 0;
        const s1 = str1.toLocaleLowerCase();
        const s2 = str2.toLocaleLowerCase();
        if (s1 === s2)
            return 1;
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        // Check if one is substring of other
        if (longer.includes(shorter))
            return 0.9;
        // Levenshtein distance
        const distance = this.levenshteinDistance(s1, s2);
        const maxLen = Math.max(s1.length, s2.length);
        return Math.max(0, 1 - distance / maxLen);
    }
    /**
     * Levenshtein distance algorithm
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
    /**
     * Create new cluster with master ticket and initial members
     */
    async createCluster(masterTicket, scored) {
        // Generate cluster number
        const count = await this.db.ticketCluster.count();
        const clusterNumber = `CLUSTER-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(count + 1).padStart(4, '0')}`;
        // Determine common attributes
        const locations = [masterTicket.location, ...scored.map((s) => s.ticket.location)].filter(Boolean);
        const customers = [masterTicket.customer, ...scored.map((s) => s.ticket.customer)].filter(Boolean);
        const services = [masterTicket.service, ...scored.map((s) => s.ticket.service)].filter(Boolean);
        const commonLocation = locations.length > scored.length / 2 ? locations[0] : null;
        const commonCustomer = customers.length > scored.length / 2 ? customers[0] : null;
        const commonService = services.length > scored.length / 2 ? services[0] : null;
        // Calculate impact score
        const priorityWeights = { CRITICAL: 40, HIGH: 25, MEDIUM: 15, LOW: 5 };
        const impactScore = Math.min(100, 25 + // base score
            (scored.length * 10) + // member count
            (priorityWeights[masterTicket.priority] ?? 0));
        const cluster = await this.db.ticketCluster.create({
            data: {
                clusterNumber,
                masterTicketId: masterTicket.id,
                commonLocation,
                commonCustomer,
                commonService,
                severity: masterTicket.priority,
                impactScore,
                affectedTicketCount: scored.length + 1,
                members: {
                    create: scored.map((s, index) => ({
                        ticketId: s.ticket.id,
                        similarityScore: s.similarity,
                        matchingFactors: s.factors,
                        position: index + 1,
                    })),
                },
            },
            include: { members: true },
        });
        // Log cluster creation
        await this.db.ticketClusterHistory.create({
            data: {
                clusterId: cluster.id,
                action: 'created',
                details: {
                    masterTicketId: masterTicket.id,
                    memberCount: scored.length,
                    matchingFactors: { commonLocation, commonCustomer, commonService },
                },
                note: `Smart clustering detected ${scored.length} related tickets with master ${masterTicket.ticketNumber}`,
            },
        });
        return cluster;
    }
    /**
     * Add existing ticket to cluster
     */
    async addMemberToCluster(clusterId, ticket, similarity, factors) {
        const memberCount = await this.db.ticketClusterMember.count({ where: { clusterId } });
        await this.db.ticketClusterMember.create({
            data: {
                clusterId,
                ticketId: ticket.id,
                similarityScore: similarity,
                matchingFactors: factors,
                position: memberCount + 1,
            },
        });
        // Update cluster metrics
        await this.db.ticketCluster.update({
            where: { id: clusterId },
            data: {
                affectedTicketCount: memberCount + 2, // +2 because master is already counted
                updatedAt: new Date(),
            },
        });
        // Log to history
        await this.db.ticketClusterHistory.create({
            data: {
                clusterId,
                action: 'member_added',
                details: { ticketId: ticket.id, similarity, factors },
                note: `Added ${ticket.ticketNumber} to cluster (${(similarity * 100).toFixed(0)}% similarity)`,
            },
        });
    }
}
export default TicketClusteringService;
//# sourceMappingURL=index.js.map