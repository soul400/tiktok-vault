fetch('http://localhost:4000/api/powerups/vault')
  .then(res => res.json())
  .then(data => {
    console.log('Success:', data.success);
    console.log('Tools:');
    if (data.data && data.data.tools) {
      data.data.tools.forEach(t => {
        console.log('  ' + t.code + ' (' + t.nameAr + '): Rem=' + t.remainingCount + ', Used=' + t.totalUsed + ', Acq=' + t.totalAcquired);
      });
    }
    console.log('\nSupporter Balances Count:', data.data ? data.data.supporterBalances.length : 0);
    if (data.data && data.data.supporterBalances) {
      data.data.supporterBalances.slice(0, 10).forEach(b => {
        console.log('  @' + b.user.uniqueId + ' ' + b.tool.code + ' Avail=' + b.availableBalance + ' Used=' + b.totalUsed + ' Total=' + b.totalAcquired);
      });
    }
  })
  .catch(console.error);
