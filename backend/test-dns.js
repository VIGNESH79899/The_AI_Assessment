import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  dns.resolveSrv('_mongodb._tcp.cluster0.gfifs6h.mongodb.net', (err, addresses) => {
    if (err) {
      console.error('DNS Error:', err);
    } else {
      console.log('DNS Success:', addresses);
    }
  });
} catch (e) {
  console.error('Catch Error:', e);
}
