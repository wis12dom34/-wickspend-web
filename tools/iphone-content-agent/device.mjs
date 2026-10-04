import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function verifyPhysicalIPhone(udid) {
  if (!udid) return { ok: false, reason: 'IPHONE_UDID is not configured' };

  const { stdout } = await execFileAsync(
    'xcrun',
    ['xctrace', 'list', 'devices'],
    { timeout: 15000 }
  );

  const output = String(stdout || '');
  const simulatorStart = output.indexOf('== Simulators ==');
  const physicalOnly =
    simulatorStart >= 0 ? output.slice(0, simulatorStart) : output;

  const line = physicalOnly
    .split('\n')
    .find((item) => item.includes('(' + udid + ')'));

  if (!line) {
    return {
      ok: false,
      reason: 'Configured UDID is not listed as a connected physical Apple device',
    };
  }

  if (!/iphone/i.test(line)) {
    return {
      ok: false,
      reason: 'Configured physical device is not identified as an iPhone',
    };
  }

  return { ok: true, device: line.trim() };
}
