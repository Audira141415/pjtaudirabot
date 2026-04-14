param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'logs')]
    [string]$Action,

    [string]$RemoteHost = 'audira@192.168.100.157',
    [int]$Tail = 200
)

$ErrorActionPreference = 'Stop'

function Invoke-Remote {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command
    )

    ssh $RemoteHost $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Remote command failed with exit code $LASTEXITCODE"
    }
}

$composePrefix = @(
    'cd /home/audira/pjtaudirabot',
    'git pull origin main',
    'cd docker',
    'docker compose --env-file ../.env.production --env-file ~/.config/pjtaudi/secrets.env -f docker-compose.yml -f docker-compose.prod.yml'
)

switch ($Action) {
    'start' {
        $cmd = ($composePrefix[0] + ' && ' + $composePrefix[1] + ' && ' + $composePrefix[2] + ' && ' + $composePrefix[3] + ' up -d --build' + ' && ' + $composePrefix[3] + ' ps' + ' && echo && curl -fsS http://localhost:4000/health')
        Invoke-Remote -Command $cmd
    }

    'stop' {
        $cmd = ($composePrefix[0] + ' && ' + $composePrefix[2] + ' && ' + $composePrefix[3] + ' down')
        Invoke-Remote -Command $cmd
    }

    'restart' {
        $cmd = ($composePrefix[0] + ' && ' + $composePrefix[1] + ' && ' + $composePrefix[2] + ' && ' + $composePrefix[3] + ' down' + ' && ' + $composePrefix[3] + ' up -d --build' + ' && ' + $composePrefix[3] + ' ps' + ' && echo && curl -fsS http://localhost:4000/health')
        Invoke-Remote -Command $cmd
    }

    'status' {
        $cmd = ($composePrefix[0] + ' && ' + $composePrefix[2] + ' && ' + $composePrefix[3] + ' ps' + ' && echo && curl -fsS http://localhost:4000/health')
        Invoke-Remote -Command $cmd
    }

    'logs' {
        $cmd = ($composePrefix[0] + ' && ' + $composePrefix[2] + ' && ' + $composePrefix[3] + " logs --tail=$Tail api whatsapp telegram db redis")
        Invoke-Remote -Command $cmd
    }
}
