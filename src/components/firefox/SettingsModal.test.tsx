import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { SettingsModal } from "./SettingsModal";
import { DebugProvider } from "../../contexts/DebugContext";
import { ProfileProvider } from "../../contexts/ProfileContext";

// Mock the Link component from tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, onClick, className }: any) => (
    <a href={to} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

// Mock useSqliteVec hook to prevent Worker not defined error
const mockSelectArrays = vi.fn();
const mockExec = vi.fn();

vi.mock("~/hooks/useSqliteVec", () => ({
  useSqliteVec: () => ({
    isInitialized: false,
    selectArrays: mockSelectArrays,
    exec: mockExec,
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
global.localStorage = localStorageMock as Storage;

// Mock fetch to prevent network requests in tests
global.fetch = vi.fn();

// Mock window properties
Object.defineProperty(window, "screen", {
  value: { width: 1920, height: 1080 },
  writable: true,
});

Object.defineProperty(window, "innerWidth", {
  value: 1024,
  writable: true,
});

Object.defineProperty(window, "innerHeight", {
  value: 768,
  writable: true,
});

Object.defineProperty(navigator, "userAgent", {
  value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  writable: true,
});

Object.defineProperty(navigator, "platform", {
  value: "MacIntel",
  writable: true,
});

Object.defineProperty(navigator, "cookieEnabled", {
  value: true,
  writable: true,
});

const renderWithProviders = (component: React.ReactElement) => {
  // Since SettingsModal uses Link from tanstack/router, we need to provide a router context
  // For simplicity, we'll just render the component directly with DebugProvider and ProfileProvider
  return render(
    <ProfileProvider>
      <DebugProvider>{component}</DebugProvider>
    </ProfileProvider>
  );
};

describe("SettingsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset localStorage mock to return null by default (no stored profiles)
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === "selected-profile") return null;
      if (key.startsWith("firefox-browser-state-")) return null;
      if (key === "infer-access-key") return "";
      return null;
    });
    
    // Reset database mocks
    mockSelectArrays.mockReset();
    mockExec.mockReset();
    
    // Mock fetch to reject immediately to prevent network requests
    (global.fetch as any).mockRejectedValue(new Error('Network request blocked in tests'));
  });

  it("should not render when isOpen is false", () => {
    renderWithProviders(<SettingsModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText("Settings & Help")).toBe(null);
  });

  it("should render when isOpen is true", () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText("Settings & Help")).toBeTruthy();
  });

  it("should display all main sections", () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={() => {}} />);
    
    // Check that tabs are rendered
    expect(screen.getByText("General")).toBeTruthy();
    expect(screen.getByText("Shortcuts")).toBeTruthy();
    expect(screen.getByText("Diagnostics")).toBeTruthy();
    
    // Check that the default General tab content is visible
    expect(screen.getByText("Starting States")).toBeTruthy();
    expect(screen.getByText("Infer Access Key")).toBeTruthy();
    expect(screen.getByText("User Profile")).toBeTruthy();
  });

  it("should show diagnostics content when diagnostics tab is clicked", () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={() => {}} />);
    
    // Click on diagnostics tab
    const diagnosticsTab = screen.getByText("Diagnostics");
    fireEvent.click(diagnosticsTab);
    
    // Check if System Information section is visible
    expect(screen.getByText("System Information")).toBeTruthy();
    expect(screen.getByText("Platform")).toBeTruthy();
    expect(screen.getByText("macOS")).toBeTruthy();
  });

  it("should close when clicking the close button", () => {
    const onClose = vi.fn();
    renderWithProviders(<SettingsModal isOpen={true} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText("Close");
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should close when pressing Escape key", () => {
    const onClose = vi.fn();
    renderWithProviders(<SettingsModal isOpen={true} onClose={onClose} />);
    
    fireEvent.keyDown(window, { key: "Escape" });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should display Toggle Settings shortcut", () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={() => {}} />);
    
    // Click on shortcuts tab first
    const shortcutsTab = screen.getByText("Shortcuts");
    fireEvent.click(shortcutsTab);
    
    // Find the Settings section in shortcuts
    const settingsSection = screen.getByText("Settings");
    expect(settingsSection).toBeTruthy();
    
    // Check that Toggle Settings is displayed with the correct shortcut
    expect(screen.getByText("Toggle Settings")).toBeTruthy();
    
    // Check for the shortcut key display (⌘? on macOS)
    const shortcutElements = screen.getAllByText(/⌘\?|Ctrl\+\?/);
    expect(shortcutElements.length).toBeGreaterThan(0);
  });

  it("should switch between tabs", () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={() => {}} />);
    
    // Initially should see general tab content
    expect(screen.getByText("Starting States")).toBeTruthy();
    expect(screen.queryByText("Navigation")).toBe(null);
    
    // Click shortcuts tab
    const shortcutsTab = screen.getByText("Shortcuts");
    fireEvent.click(shortcutsTab);
    
    // Should see shortcuts content and not general content
    expect(screen.getByText("Navigation")).toBeTruthy();
    expect(screen.queryByText("Starting States")).toBe(null);
    
    // Click diagnostics tab
    const diagnosticsTab = screen.getByText("Diagnostics");
    fireEvent.click(diagnosticsTab);
    
    // Should see diagnostics content and not shortcuts content
    expect(screen.getByText("System Information")).toBeTruthy();
    expect(screen.queryByText("Navigation")).toBe(null);
  });

  it("should save access key when submitting form", () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={() => {}} />);
    
    const input = screen.getByPlaceholderText("Enter your Infer access key");
    const saveButton = screen.getByText("Save");
    
    fireEvent.change(input, { target: { value: "test-key-123" } });
    fireEvent.click(saveButton);
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith("infer-access-key", "test-key-123");
  });

  it("should clear access key when clicking Clear button", () => {
    // Override the default mock for this test only
    localStorageMock.getItem.mockImplementation((key) => 
      key === "infer-access-key" ? "existing-key" : null
    );
    renderWithProviders(<SettingsModal isOpen={true} onClose={() => {}} />);
    
    const clearButton = screen.getByText("Clear");
    fireEvent.click(clearButton);
    
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("infer-access-key");
  });

  it("should display browser features correctly", () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={() => {}} />);
    
    // Click on diagnostics tab first
    const diagnosticsTab = screen.getByText("Diagnostics");
    fireEvent.click(diagnosticsTab);
    
    // Check for browser features section
    expect(screen.getByText("Browser Features")).toBeTruthy();
    expect(screen.getByText("Local Storage")).toBeTruthy();
    expect(screen.getByText("Service Workers")).toBeTruthy();
    expect(screen.getByText("WebGL")).toBeTruthy();
    expect(screen.getByText("Cookies")).toBeTruthy();
  });

  it("should display starting states", () => {
    renderWithProviders(<SettingsModal isOpen={true} onClose={() => {}} />);
    
    // Check for the starting states section
    expect(screen.getByText("Starting States")).toBeTruthy();
    expect(screen.getByText("Fresh browser state")).toBeTruthy();
    expect(screen.getByText("Autumn Search")).toBeTruthy();
    expect(screen.getByText("DuckDuckGo search with sidebar open")).toBeTruthy();
  });
});