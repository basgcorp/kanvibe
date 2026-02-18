import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockShellStream = {
  write: vi.fn(),
  on: vi.fn(),
  close: vi.fn(),
  setWindow: vi.fn(),
};

const mockSshConn = {
  on: vi.fn().mockReturnThis(),
  connect: vi.fn(),
  shell: vi.fn(),
  end: vi.fn(),
};

vi.mock("ssh2", () => ({
  Client: class {
    on = mockSshConn.on;
    connect = mockSshConn.connect;
    shell = mockSshConn.shell;
    end = mockSshConn.end;
  },
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    default: { ...actual, readFileSync: vi.fn(() => "fake-private-key") },
    readFileSync: vi.fn(() => "fake-private-key"),
  };
});

vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return {
    ...actual,
    default: { ...actual, execSync: vi.fn() },
    execSync: vi.fn(),
  };
});

vi.mock("@/entities/KanbanTask", () => ({
  SessionType: { TMUX: "tmux", ZELLIJ: "zellij" },
}));

describe("attachRemoteSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSshConn.on.mockReturnThis();
  });

  function setupSshReady() {
    mockSshConn.on.mockImplementation(function (this: typeof mockSshConn, event: string, cb: (...args: unknown[]) => void) {
      if (event === "ready") {
        mockSshConn.shell.mockImplementation((_opts: unknown, shellCb: (err: null, stream: typeof mockShellStream) => void) => {
          shellCb(null, mockShellStream);
        });
        cb();
      }
      return this;
    });
  }

  function createMockWs() {
    return {
      readyState: 1,
      OPEN: 1,
      send: vi.fn(),
      on: vi.fn(),
      close: vi.fn(),
    } as unknown as import("ws").WebSocket;
  }

  it("should send SSH stream data as UTF-8 string, not binary Buffer", async () => {
    // Given
    setupSshReady();
    const mockWs = createMockWs();
    const { attachRemoteSession } = await import("@/lib/terminal");

    // When
    await attachRemoteSession(
      "test-task-id",
      "remote.host",
      "tmux" as never,
      "test-session",
      "main",
      mockWs,
      { hostname: "1.2.3.4", port: 22, username: "root", privateKeyPath: "/root/.ssh/id_ed25519" },
      120,
      30,
    );

    // Simulate SSH stream emitting data as Buffer
    const dataHandler = mockShellStream.on.mock.calls.find(
      (call: unknown[]) => call[0] === "data"
    )?.[1] as ((data: Buffer) => void) | undefined;
    expect(dataHandler).toBeDefined();

    const testBuffer = Buffer.from("root@host:~$ ");
    dataHandler!(testBuffer);

    // Then — ws.send should receive a UTF-8 string, not a Buffer
    expect(mockWs.send).toHaveBeenCalledWith("root@host:~$ ");
    expect(typeof mockWs.send.mock.calls[0][0]).toBe("string");
  });

  it("should send tmux attach-session command via SSH shell", async () => {
    // Given
    setupSshReady();
    const mockWs = createMockWs();
    const { attachRemoteSession } = await import("@/lib/terminal");

    // When
    await attachRemoteSession(
      "test-task-id-2",
      "remote.host",
      "tmux" as never,
      "my-session",
      "feature-branch",
      mockWs,
      { hostname: "1.2.3.4", port: 22, username: "root", privateKeyPath: "/root/.ssh/id_ed25519" },
    );

    // Then
    expect(mockShellStream.write).toHaveBeenCalledWith(
      'tmux attach-session -t "my-session:feature-branch"\n'
    );
  });
});
