# qdmetrics
Nodejs program to query dispatch router and respond to prometheus /metrics requests

## Requirements:
  - nodejs
  - prometheus and optionally grafana
  - qdrouter

## Installation during development:
  - git clone https://github.com/ErnieAllen/qdmetrics.git
  - cd qdmetrics
  - npm install

## Prometheus setup:
  Add the following to your prometheus.yml and then restart prometheus
```
  - job_name: 'qdmetrics'

    scrape_interval: 5s

    static_configs:
      - targets: ['localhost:5674']
```

## Router setup:
  An http listener must be setup on at least one router in your network
  Example listener section:
```
listener {
    role: normal
    host: 0.0.0.0
    port: 5673
    http: true
    saslMechanisms: ANONYMOUS
}
```

## Starting qdmetrics
  node qdmetrics.js

  This starts qdmetrics with the default options. 
  ### Specifying options
  The default options can be overridden in three ways:
  1. Using the options.json file
  2. Setting environment variables
  3. On the command line

  <span style="display: inline-block; margin: 1em; padding: 1em; border: 1px solid green; color: black; background-color:#C0FFC0">The command line overrides the environment which overrides the options.json file.</span>

  ### 1. options.json
  This is a JSON file with a name/value for each option to be specified. For example:
```
  {
  "port": 5673
  }
```
  Will override just the port to use to connect to a router.

  ### 2. Environment variables
  To set an option using the environment, prepend METRICS_ to the option name. For example:
```
  METRICS_SCRAPE=5674
```
  Will override just the port on which qdmetrics will listen for prometheus scrape requests.

  ### 3. Command line
    
  To display possible options use node qdmetrics.js -h
```
  qdmetrics - prometheus client for qpid dispatch router
    usage: node qdmetrics.js <options>

  Options:
    -h                  Show this help text 
    -v                  Show version 
    -scrape #           Port on which to listen for scape requests [5674]
    -refresh #          Seconds between calls to refresh router topology [60]
    -local true|false   Only query the connected router [false]
    -edge true|false    Query edge routers [true]
  Connection options:
    -address            Address of router
    -port               Http enabled port on which a router is listening [5673]
    -ssl-certificate    Client SSL certificate (PEM Format)
    -ssl-key=KEY        Client SSL private key (PEM Format)
    -ssl-trustfile      Trusted Certificate Authority Database file (PEM
                        Format)
    -ssl-password       Certificate password, will be prompted if not
                        specifed.
    -ssl-password-file  Certificate password, will be prompted if not
                        specifed.
    -sasl-mechanisms    Allowed sasl mechanisms to be supplied during the sasl
                        handshake.
    -username           User name for SASL plain authentication
    -password           Password for SASL plain authentication
    -sasl-password-file Password for SASL plain authentication
    -ssl-disable-peer-name-verify
                        Disables SSL peer name verification. WARNING - This
                        option is insecure and must not be used in production
                        environments
```

## Specifying which statistics are collected
The file stats.json contains the router stastistics which will be returned for each prometheus scrape request.
It is a JSON file. An example is:
```
{
  "stats": [
    {
      "entity": "router",
      "attributes": [
        "deliveriesEgress",
        "addrCount",
        "connectionCount"
      ]
    },
    {
      "entity": "logStats",
      "alias": "module",
      "attributes": [
        "infoCount",
        "debugCount",
        "errorCount",
        "criticalCount",
        "noticeCount",
        "traceCount",
        "warningCount"
      ]
    }
  ]
}
```
This would collect the following statistics:

  - router.deliveriedEgress
  - router.addrCount
  - router.connectionCount
  - logStats.infoCount
  - logStats.debugCount
  - logStats.errorCount
  - logStats.criticalCount
  - logStats.noticeCount
  - logStats.traceCount
  - logStats.warningCount

All statistics are labeled with the router name from which they were collected. This allows prometheus/grafana to show seperate graphs per router if desired.

Using the above stats.json and a single router named 'A', the following response is generated for a prometheus /metrics request:
```
# HELP qdmetrics_deliveriesEgress Number of deliveries that were sent by the router to a receiver that is directly attached to the router.
# TYPE qdmetrics_deliveriesEgress gauge
qdmetrics_deliveriesEgress{router="A"} 1385414

# HELP qdmetrics_addrCount Number of addresses known to the router.
# TYPE qdmetrics_addrCount gauge
qdmetrics_addrCount{router="A"} 13

# HELP qdmetrics_connectionCount Number of open connections to the router node.
# TYPE qdmetrics_connectionCount gauge
qdmetrics_connectionCount{router="A"} 2

# HELP qdmetrics_infoCount How many info-level events have happened on this log.
# TYPE qdmetrics_infoCount gauge
qdmetrics_infoCount{router="A",module="DEFAULT"} 0
qdmetrics_infoCount{router="A",module="ERROR"} 0
qdmetrics_infoCount{router="A",module="PYTHON"} 0
qdmetrics_infoCount{router="A",module="MESSAGE"} 0
qdmetrics_infoCount{router="A",module="MAIN"} 0
qdmetrics_infoCount{router="A",module="AGENT"} 1
qdmetrics_infoCount{router="A",module="POLICY"} 2
qdmetrics_infoCount{router="A",module="HTTP"} 0
qdmetrics_infoCount{router="A",module="ROUTER_LS"} 12
qdmetrics_infoCount{router="A",module="ROUTER_MA"} 0
qdmetrics_infoCount{router="A",module="CONN_MGR"} 5
qdmetrics_infoCount{router="A",module="ROUTER_HELLO"} 0
qdmetrics_infoCount{router="A",module="SERVER"} 8
qdmetrics_infoCount{router="A",module="CONTAINER"} 0
qdmetrics_infoCount{router="A",module="ROUTER_CORE"} 14
qdmetrics_infoCount{router="A",module="ROUTER"} 3
qdmetrics_infoCount{router="A",module="AUTHSERVICE"} 0
qdmetrics_infoCount{router="A",module="DISPLAYNAME"} 0

# HELP qdmetrics_debugCount How many debug-level events have happened on this log.
# TYPE qdmetrics_debugCount gauge
qdmetrics_debugCount{router="A",module="DEFAULT"} 0
qdmetrics_debugCount{router="A",module="ERROR"} 0
qdmetrics_debugCount{router="A",module="PYTHON"} 0
qdmetrics_debugCount{router="A",module="MESSAGE"} 0
qdmetrics_debugCount{router="A",module="MAIN"} 0
qdmetrics_debugCount{router="A",module="AGENT"} 534698
qdmetrics_debugCount{router="A",module="POLICY"} 0
qdmetrics_debugCount{router="A",module="HTTP"} 0
qdmetrics_debugCount{router="A",module="ROUTER_LS"} 0
qdmetrics_debugCount{router="A",module="ROUTER_MA"} 0
qdmetrics_debugCount{router="A",module="CONN_MGR"} 0
qdmetrics_debugCount{router="A",module="ROUTER_HELLO"} 0
qdmetrics_debugCount{router="A",module="SERVER"} 0
qdmetrics_debugCount{router="A",module="CONTAINER"} 0
qdmetrics_debugCount{router="A",module="ROUTER_CORE"} 0
qdmetrics_debugCount{router="A",module="ROUTER"} 0
qdmetrics_debugCount{router="A",module="AUTHSERVICE"} 0
qdmetrics_debugCount{router="A",module="DISPLAYNAME"} 0

# HELP qdmetrics_errorCount How many error-level events have happened on this log.
# TYPE qdmetrics_errorCount gauge
qdmetrics_errorCount{router="A",module="DEFAULT"} 0
qdmetrics_errorCount{router="A",module="ERROR"} 0
qdmetrics_errorCount{router="A",module="PYTHON"} 0
qdmetrics_errorCount{router="A",module="MESSAGE"} 0
qdmetrics_errorCount{router="A",module="MAIN"} 0
qdmetrics_errorCount{router="A",module="AGENT"} 0
qdmetrics_errorCount{router="A",module="POLICY"} 0
qdmetrics_errorCount{router="A",module="HTTP"} 0
qdmetrics_errorCount{router="A",module="ROUTER_LS"} 0
qdmetrics_errorCount{router="A",module="ROUTER_MA"} 0
qdmetrics_errorCount{router="A",module="CONN_MGR"} 0
qdmetrics_errorCount{router="A",module="ROUTER_HELLO"} 0
qdmetrics_errorCount{router="A",module="SERVER"} 0
qdmetrics_errorCount{router="A",module="CONTAINER"} 0
qdmetrics_errorCount{router="A",module="ROUTER_CORE"} 0
qdmetrics_errorCount{router="A",module="ROUTER"} 0
qdmetrics_errorCount{router="A",module="AUTHSERVICE"} 0
qdmetrics_errorCount{router="A",module="DISPLAYNAME"} 0

# HELP qdmetrics_criticalCount How many critical-level events have happened on this log.
# TYPE qdmetrics_criticalCount gauge
qdmetrics_criticalCount{router="A",module="DEFAULT"} 0
qdmetrics_criticalCount{router="A",module="ERROR"} 0
qdmetrics_criticalCount{router="A",module="PYTHON"} 0
qdmetrics_criticalCount{router="A",module="MESSAGE"} 0
qdmetrics_criticalCount{router="A",module="MAIN"} 0
qdmetrics_criticalCount{router="A",module="AGENT"} 0
qdmetrics_criticalCount{router="A",module="POLICY"} 0
qdmetrics_criticalCount{router="A",module="HTTP"} 0
qdmetrics_criticalCount{router="A",module="ROUTER_LS"} 0
qdmetrics_criticalCount{router="A",module="ROUTER_MA"} 0
qdmetrics_criticalCount{router="A",module="CONN_MGR"} 0
qdmetrics_criticalCount{router="A",module="ROUTER_HELLO"} 0
qdmetrics_criticalCount{router="A",module="SERVER"} 0
qdmetrics_criticalCount{router="A",module="CONTAINER"} 0
qdmetrics_criticalCount{router="A",module="ROUTER_CORE"} 0
qdmetrics_criticalCount{router="A",module="ROUTER"} 0
qdmetrics_criticalCount{router="A",module="AUTHSERVICE"} 0
qdmetrics_criticalCount{router="A",module="DISPLAYNAME"} 0

# HELP qdmetrics_noticeCount How many notice-level events have happened on this log.
# TYPE qdmetrics_noticeCount gauge
qdmetrics_noticeCount{router="A",module="DEFAULT"} 0
qdmetrics_noticeCount{router="A",module="ERROR"} 0
qdmetrics_noticeCount{router="A",module="PYTHON"} 0
qdmetrics_noticeCount{router="A",module="MESSAGE"} 0
qdmetrics_noticeCount{router="A",module="MAIN"} 0
qdmetrics_noticeCount{router="A",module="AGENT"} 0
qdmetrics_noticeCount{router="A",module="POLICY"} 0
qdmetrics_noticeCount{router="A",module="HTTP"} 0
qdmetrics_noticeCount{router="A",module="ROUTER_LS"} 0
qdmetrics_noticeCount{router="A",module="ROUTER_MA"} 0
qdmetrics_noticeCount{router="A",module="CONN_MGR"} 0
qdmetrics_noticeCount{router="A",module="ROUTER_HELLO"} 0
qdmetrics_noticeCount{router="A",module="SERVER"} 5
qdmetrics_noticeCount{router="A",module="CONTAINER"} 0
qdmetrics_noticeCount{router="A",module="ROUTER_CORE"} 0
qdmetrics_noticeCount{router="A",module="ROUTER"} 0
qdmetrics_noticeCount{router="A",module="AUTHSERVICE"} 0
qdmetrics_noticeCount{router="A",module="DISPLAYNAME"} 0

# HELP qdmetrics_traceCount How many trace-level events have happened on this log.
# TYPE qdmetrics_traceCount gauge
qdmetrics_traceCount{router="A",module="DEFAULT"} 0
qdmetrics_traceCount{router="A",module="ERROR"} 0
qdmetrics_traceCount{router="A",module="PYTHON"} 0
qdmetrics_traceCount{router="A",module="MESSAGE"} 0
qdmetrics_traceCount{router="A",module="MAIN"} 0
qdmetrics_traceCount{router="A",module="AGENT"} 0
qdmetrics_traceCount{router="A",module="POLICY"} 0
qdmetrics_traceCount{router="A",module="HTTP"} 0
qdmetrics_traceCount{router="A",module="ROUTER_LS"} 6733
qdmetrics_traceCount{router="A",module="ROUTER_MA"} 0
qdmetrics_traceCount{router="A",module="CONN_MGR"} 0
qdmetrics_traceCount{router="A",module="ROUTER_HELLO"} 134241
qdmetrics_traceCount{router="A",module="SERVER"} 0
qdmetrics_traceCount{router="A",module="CONTAINER"} 0
qdmetrics_traceCount{router="A",module="ROUTER_CORE"} 0
qdmetrics_traceCount{router="A",module="ROUTER"} 10
qdmetrics_traceCount{router="A",module="AUTHSERVICE"} 0
qdmetrics_traceCount{router="A",module="DISPLAYNAME"} 0

# HELP qdmetrics_warningCount How many warning-level events have happened on this log.
# TYPE qdmetrics_warningCount gauge
qdmetrics_warningCount{router="A",module="DEFAULT"} 0
qdmetrics_warningCount{router="A",module="ERROR"} 0
qdmetrics_warningCount{router="A",module="PYTHON"} 0
qdmetrics_warningCount{router="A",module="MESSAGE"} 0
qdmetrics_warningCount{router="A",module="MAIN"} 0
qdmetrics_warningCount{router="A",module="AGENT"} 1
qdmetrics_warningCount{router="A",module="POLICY"} 0
qdmetrics_warningCount{router="A",module="HTTP"} 0
qdmetrics_warningCount{router="A",module="ROUTER_LS"} 0
qdmetrics_warningCount{router="A",module="ROUTER_MA"} 0
qdmetrics_warningCount{router="A",module="CONN_MGR"} 0
qdmetrics_warningCount{router="A",module="ROUTER_HELLO"} 0
qdmetrics_warningCount{router="A",module="SERVER"} 0
qdmetrics_warningCount{router="A",module="CONTAINER"} 0
qdmetrics_warningCount{router="A",module="ROUTER_CORE"} 0
qdmetrics_warningCount{router="A",module="ROUTER"} 0
qdmetrics_warningCount{router="A",module="AUTHSERVICE"} 0
qdmetrics_warningCount{router="A",module="DISPLAYNAME"} 0
```

The HELP text for each statistic is retrieved from the router's schema's description field for the attribute associated with the statistic.

All statistics are reported using the prometheus GAUGE type.

