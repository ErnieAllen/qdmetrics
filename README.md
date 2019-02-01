# qdmetrics
Nodejs program to query dispatch router and respond to prometheus /metrics requests

Add the following to your prometheus.yml
```
  - job_name: 'qdmetrics'

    scrape_interval: 5s

    static_configs:
      - targets: ['localhost:5674']
```

After cloning into a dir:
  - npm install
  - cd src
  - ensure a router is running and has an http listener on 5673
  - node qdmetrics.js
