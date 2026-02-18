import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockExecGit = vi.fn();

vi.mock("@/lib/gitOperations", () => ({
  execGit: (...args: unknown[]) => mockExecGit(...args),
}));

vi.mock("os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("os")>();
  return {
    ...actual,
    default: { ...actual, homedir: () => "/home/testuser" },
    homedir: () => "/home/testuser",
  };
});

describe("GET /api/directories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function callGET(params: Record<string, string>) {
    const { GET } = await import("../route");
    const url = new URL("http://localhost/api/directories");
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return GET(new Request(url.toString()));
  }

  it("should resolve ~ to homedir() for local paths", async () => {
    // Given
    mockExecGit.mockResolvedValue("/home/testuser/projects\n/home/testuser/docs");

    // When
    await callGET({ path: "~" });

    // Then
    expect(mockExecGit).toHaveBeenCalledWith(
      expect.stringContaining('find "/home/testuser"'),
      null,
    );
  });

  it("should resolve ~ to $HOME for remote SSH paths", async () => {
    // Given
    mockExecGit.mockResolvedValue("/root/projects\n/root/docs");

    // When
    await callGET({ path: "~", sshHost: "remote.example.com" });

    // Then
    expect(mockExecGit).toHaveBeenCalledWith(
      expect.stringContaining('find "$HOME"'),
      "remote.example.com",
    );
  });

  it("should resolve ~/subdir to $HOME/subdir for remote SSH paths", async () => {
    // Given
    mockExecGit.mockResolvedValue("/root/projects/foo");

    // When
    await callGET({ path: "~/projects", sshHost: "remote.example.com" });

    // Then
    expect(mockExecGit).toHaveBeenCalledWith(
      expect.stringContaining('find "$HOME/projects"'),
      "remote.example.com",
    );
  });

  it("should not modify absolute paths", async () => {
    // Given
    mockExecGit.mockResolvedValue("/opt/app1\n/opt/app2");

    // When
    await callGET({ path: "/opt", sshHost: "remote.example.com" });

    // Then
    expect(mockExecGit).toHaveBeenCalledWith(
      expect.stringContaining('find "/opt"'),
      "remote.example.com",
    );
  });

  it("should filter hidden directories from results", async () => {
    // Given
    mockExecGit.mockResolvedValue("/opt/.hidden\n/opt/visible");

    // When
    const response = await callGET({ path: "/opt" });
    const data = await response.json();

    // Then
    expect(data).toEqual(["visible"]);
  });

  it("should return empty array when no output", async () => {
    // Given
    mockExecGit.mockResolvedValue("");

    // When
    const response = await callGET({ path: "/nonexistent" });
    const data = await response.json();

    // Then
    expect(data).toEqual([]);
  });

  it("should return 500 with error message on failure", async () => {
    // Given
    mockExecGit.mockRejectedValue(new Error("SSH connection failed"));

    // When
    const response = await callGET({ path: "/opt", sshHost: "bad.host" });
    const data = await response.json();

    // Then
    expect(response.status).toBe(500);
    expect(data.error).toBe("SSH connection failed");
  });
});
