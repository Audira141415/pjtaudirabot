param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'logs')]
    [string]$Action,

    [string]$Host = 'audira@192.168.100.157',
    [int]$Tail = 200
)

$ErrorActionPreference = 'Stop'

function Invoke-Remote {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command
    )

    ssh $Host $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Remote command failed with exit code $LASTEXITCODE"
    }
}

$composePrefix = @(
    'cd /home/audira/pjtaudirabot/docker',
    'docker compose --env-file ../.env.production --env-file ~/.config/pjtaudi/secrets.env -f docker-compose.yml -f docker-compose.prod.yml'
)

switch ($Action) {
    'start' {
        $cmd = ($composePrefix[0] + ' && ' + $composePrefix[1] + ' up -d --build' + ' && ' + $composePrefix[1] + ' ps' + ' && echo && curl -fsS http://localhost:4000/health')
        Invoke-Remote -Command $cmd
    }

    'stop' {
        $cmd = ($composePrefix[0] + ' && ' + $composePrefix[1] + ' down')
        Invoke-Remote -Command $cmd
    }

    'restart' {
        $cmd = ($composePrefix[0] + ' && ' + $composePrefix[1] + ' down' + ' && ' + $composePrefix[1] + ' up -d --build' + ' && ' + $composePrefix[1] + ' ps' + ' && echo && curl -fsS http://localhost:4000/health')
        Invoke-Remote -Command $cmd
    }

    'status' {
        $cmd = ($composePrefix[0] + ' && ' + $composePrefix[1] + ' ps' + ' && echo && curl -fsS http://localhost:4000/health')
        Invoke-Remote -Command $cmd
    }

    'logs' {
        $cmd = ($composePrefix[0] + ' && ' + $composePrefix[1] + " logs --tail=$Tail api whatsapp telegram db redis")
        Invoke-Remote -Command $cmd
    }
}
