import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { homedir } from "os";
import path from "path";

export interface SSHHostConfig {
  host: string;
  hostname: string;
  port: number;
  username: string;
  privateKeyPath: string;
}

/**
 * ~/.ssh/config 파일을 파싱하여 호스트 목록을 반환한다.
 * Host, HostName, User, IdentityFile, Port 필드를 추출한다.
 */
export async function parseSSHConfig(): Promise<SSHHostConfig[]> {
  const configPath = path.join(homedir(), ".ssh", "config");

  let content: string;
  try {
    content = await readFile(configPath, "utf-8");
  } catch {
    return [];
  }

  const hosts: SSHHostConfig[] = [];
  let current: Partial<SSHHostConfig> | null = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const [key, ...valueParts] = line.split(/\s+/);
    const value = valueParts.join(" ");

    if (key.toLowerCase() === "host") {
      if (current?.host && current.hostname) {
        hosts.push(fillDefaults(current));
      }
      current = { host: value };
    } else if (current) {
      switch (key.toLowerCase()) {
        case "hostname":
          current.hostname = value;
          break;
        case "user":
          current.username = value;
          break;
        case "port":
          current.port = parseInt(value, 10);
          break;
        case "identityfile":
          current.privateKeyPath = value.replace("~", homedir());
          break;
      }
    }
  }

  if (current?.host && current.hostname) {
    hosts.push(fillDefaults(current));
  }

  return hosts;
}

/** OpenSSH 우선순위에 따라 첫 번째로 존재하는 기본 비밀키 경로를 반환한다 */
export function findDefaultPrivateKey(): string {
  const sshDir = path.join(homedir(), ".ssh");
  const candidates = ["id_ed25519", "id_ecdsa", "id_rsa", "id_dsa"];

  for (const name of candidates) {
    const keyPath = path.join(sshDir, name);
    if (existsSync(keyPath)) return keyPath;
  }

  return path.join(sshDir, "id_ed25519");
}

function fillDefaults(partial: Partial<SSHHostConfig>): SSHHostConfig {
  return {
    host: partial.host!,
    hostname: partial.hostname!,
    port: partial.port || 22,
    username: partial.username || "root",
    privateKeyPath: partial.privateKeyPath || findDefaultPrivateKey(),
  };
}

/** 사용 가능한 SSH 호스트 이름 목록을 반환한다 */
export async function getAvailableHosts(): Promise<string[]> {
  const configs = await parseSSHConfig();
  return configs.map((c) => c.host);
}
