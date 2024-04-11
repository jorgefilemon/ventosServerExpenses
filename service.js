var Service = require("node-windows").Service;

var svc = new Service({
    name:'NodeService',
    description: 'node running for VentOS',
    script: 'C:\\ventos_final\\server\\server.js',
    nodeOptions: [
      '--harmony',
      '--max_old_space_size=4096'
    ]
    //, workingDirectory: '...'
    //, allowServiceLogon: true
  });
  
  // Listen for the "install" event, which indicates the
  // process is available as a service.
  svc.on('install',function(){
    svc.start();
  });
  
  svc.install();