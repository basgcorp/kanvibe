import { parseSSHConfig } from "@/lib/sshConfig";

/** SSH를 통해 원격 명령을 실행하고 stdout을 반환한다 */
export async function execRemoteCommand(sshHost: string, command: string): Promise<string> {
  const { Client } = await import("ssh2");
  const configs = await parseSSHConfig();
  const hostConfig = configs.find((c) => c.host === sshHost);

  if (!hostConfig) {
    throw new Error(`SSH 호스트를 찾을 수 없습니다: ${sshHost}`);
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on("ready", () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }

        let output = "";
        let errorOutput = "";

        stream.on("data", (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on("data", (data: Buffer) => {
          errorOutput += data.toString();
        });

        stream.on("close", (code: number) => {
          conn.end();
          if (code !== 0) {
            reject(new Error(`SSH 명령 실패 (exit ${code}): ${errorOutput}`));
          } else {
            resolve(output.trim());
          }
        });
      });
    });

    conn.on("error", reject);

    let privateKey: Buffer;
    try {
      privateKey = require("fs").readFileSync(hostConfig.privateKeyPath);
    } catch {
      return reject(new Error(`SSH 키를 읽을 수 없습니다: ${hostConfig.privateKeyPath}`));
    }

    conn.connect({
      host: hostConfig.hostname,
      port: hostConfig.port,
      username: hostConfig.username,
      privateKey,
    });
  });
}

/** 원격에 디렉토리를 생성한다 */
export async function remoteMkdir(sshHost: string, dirPath: string): Promise<void> {
  await execRemoteCommand(sshHost, `mkdir -p "${dirPath}"`);
}

/** 원격에 파일을 작성한다. base64 인코딩으로 셸 이스케이프 문제를 방지한다 */
export async function remoteWriteFile(sshHost: string, filePath: string, content: string): Promise<void> {
  const encoded = Buffer.from(content, "utf-8").toString("base64");
  await execRemoteCommand(sshHost, `echo '${encoded}' | base64 -d > "${filePath}"`);
}

/** 원격 파일의 권한을 변경한다 */
export async function remoteChmod(sshHost: string, filePath: string, mode: string): Promise<void> {
  await execRemoteCommand(sshHost, `chmod ${mode} "${filePath}"`);
}

/** 원격 파일이 존재하는지 확인한다 */
export async function remoteFileExists(sshHost: string, filePath: string): Promise<boolean> {
  try {
    await execRemoteCommand(sshHost, `test -f "${filePath}"`);
    return true;
  } catch {
    return false;
  }
}

/** 원격 파일의 내용을 읽어온다 */
export async function remoteReadFile(sshHost: string, filePath: string): Promise<string> {
  return execRemoteCommand(sshHost, `cat "${filePath}"`);
}
