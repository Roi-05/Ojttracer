function ojtHoursComplete(completedHours, requiredHours) {
  const done = parseFloat(completedHours) || 0;
  const need = parseFloat(requiredHours) || 0;
  return need > 0 && done >= need;
}

function deploymentStatusFromHours(completedHours, requiredHours, fallback = 'ongoing') {
  return ojtHoursComplete(completedHours, requiredHours) ? 'completed' : (fallback || 'ongoing');
}

module.exports = { ojtHoursComplete, deploymentStatusFromHours };
