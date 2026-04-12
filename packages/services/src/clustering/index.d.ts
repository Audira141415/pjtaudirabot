import { PrismaClient, Ticket } from '@prisma/client';
import { ILogger } from '@pjtaudirabot/core';
export interface ClusteringOptions {
    windowMinutes?: number;
    similarityThreshold?: number;
    minClusterSize?: number;
    maxMembersPerCluster?: number;
}
export interface SimilarityFactors {
    location: number;
    customer: number;
    service: number;
    problem: number;
    priority: number;
}
/**
 * Smart Ticket Clustering Service
 * Groups related tickets based on similarity (location, customer, infra, problem)
 * Auto-escalates when multiple tickets detected from same incident
 * Cascades resolution when master ticket is resolved
 */
export declare class TicketClusteringService {
    private db;
    private readonly logger;
    private readonly options;
    constructor(db: PrismaClient, logger: ILogger, opts?: ClusteringOptions);
    /**
     * Main clustering logic: called when new ticket is created
     * 1. Search for recent tickets with similar attributes
     * 2. Calculate similarity scores
     * 3. If found similar: check if cluster already exists or create new
     * 4. Add as member to cluster
     * 5. Return cluster info for notification
     */
    clusterNewTicket(ticket: Ticket): Promise<{
        clusterId?: string;
        clusterNumber?: string;
        memberCount: number;
        created: boolean;
    }>;
    /**
     * When master ticket is resolved, cascade to cluster members
     */
    cascadeResolution(ticketId: string, rootCause: string, solution: string, changedById?: string): Promise<void>;
    /**
     * Get cluster details for display/notification
     */
    getClusterDetails(clusterId: string): Promise<{
        clusterNumber: string;
        clusterUrl: string;
        masterTicket: {
            number: string;
            title: string;
            priority: import("@prisma/client").$Enums.TicketPriority;
            category: import("@prisma/client").$Enums.TicketCategory;
        };
        summary: {
            affectedTickets: number;
            commonLocation: string | null;
            commonCustomer: string | null;
            commonService: string | null;
            affectedAssets: import("@prisma/client/runtime/library").JsonValue;
            severity: import("@prisma/client").$Enums.TicketPriority;
            impactScore: number;
        };
        members: {
            ticketNumber: string;
            title: string;
            status: import("@prisma/client").$Enums.TicketStatus;
            priority: import("@prisma/client").$Enums.TicketPriority;
            similarity: string;
        }[];
        timeline: {
            detectedAt: Date;
            escalatedAt: Date | null;
            resolvedAt: Date | null;
        };
    } | null>;
    /**
     * Similarity calculation algorithm
     * Weighted score from: location (0.3), customer (0.2), service (0.2), problem (0.2), priority (0.1)
     */
    private calculateSimilarity;
    /**
     * Get matching factors for this specific pair
     */
    private getMatchingFactors;
    /**
     * Exact match scoring
     */
    private scoreMatch;
    /**
     * Priority proximity scoring (e.g. HIGH vs CRITICAL is closer than HIGH vs LOW)
     */
    private priorityMatch;
    /**
     * Levenshtein-inspired string similarity for problem field
     * Returns 0-1 score
     */
    private stringSimilarity;
    /**
     * Levenshtein distance algorithm
     */
    private levenshteinDistance;
    /**
     * Create new cluster with master ticket and initial members
     */
    private createCluster;
    /**
     * Add existing ticket to cluster
     */
    private addMemberToCluster;
}
export default TicketClusteringService;
//# sourceMappingURL=index.d.ts.map