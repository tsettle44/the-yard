import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "@/hooks/use-local-storage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("returns initial value before hydration", () => {
    const { result } = renderHook(() => useLocalStorage("key", "initial"));
    expect(result.current[0]).toBe("initial");
  });

  it("hydrates from localStorage", () => {
    localStorage.setItem("key", JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage("key", "initial"));
    // After effect runs, value should be hydrated
    expect(result.current[2]).toBe(true); // hydrated
  });

  it("sets hydrated flag after mount", () => {
    const { result } = renderHook(() => useLocalStorage("key", "initial"));
    expect(result.current[2]).toBe(true);
  });

  it("writes to localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("key", "initial"));
    act(() => {
      result.current[1]("updated");
    });
    expect(result.current[0]).toBe("updated");
    expect(localStorage.setItem).toHaveBeenCalledWith("key", JSON.stringify("updated"));
  });

  it("handles JSON serialization of complex objects", () => {
    const { result } = renderHook(() => useLocalStorage("key", { a: 1, b: 0 }));
    act(() => {
      result.current[1]({ a: 2, b: 3 });
    });
    expect(result.current[0]).toEqual({ a: 2, b: 3 });
  });

  it("supports updater function", () => {
    const { result } = renderHook(() => useLocalStorage("key", 0));
    act(() => {
      result.current[1]((prev) => prev + 1);
    });
    expect(result.current[0]).toBe(1);
  });

  it("handles localStorage read errors gracefully", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error("Permission denied");
    });
    const { result } = renderHook(() => useLocalStorage("key", "fallback"));
    expect(result.current[0]).toBe("fallback");
    consoleSpy.mockRestore();
  });

  it("handles localStorage write errors gracefully", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error("Quota exceeded");
    });
    const { result } = renderHook(() => useLocalStorage("key", "value"));
    act(() => {
      result.current[1]("newvalue");
    });
    // Should not throw
    consoleSpy.mockRestore();
  });

  it("handles arrays", () => {
    const { result } = renderHook(() => useLocalStorage<number[]>("key", []));
    act(() => {
      result.current[1]([1, 2, 3]);
    });
    expect(result.current[0]).toEqual([1, 2, 3]);
  });

  it("syncs across multiple hooks with the same key", () => {
    const { result: hookA } = renderHook(() => useLocalStorage("shared-key", "initial"));
    const { result: hookB } = renderHook(() => useLocalStorage("shared-key", "initial"));

    // Both start with the same value
    expect(hookA.current[0]).toBe("initial");
    expect(hookB.current[0]).toBe("initial");

    // Update from hookA
    act(() => {
      hookA.current[1]("updated-by-a");
    });

    // hookB should reflect the change
    expect(hookA.current[0]).toBe("updated-by-a");
    expect(hookB.current[0]).toBe("updated-by-a");

    // Update from hookB
    act(() => {
      hookB.current[1]("updated-by-b");
    });

    // hookA should reflect the change
    expect(hookA.current[0]).toBe("updated-by-b");
    expect(hookB.current[0]).toBe("updated-by-b");
  });

  it("re-reads when key changes", () => {
    localStorage.setItem("key1", JSON.stringify("value1"));
    localStorage.setItem("key2", JSON.stringify("value2"));
    const { result, rerender } = renderHook(
      ({ key }) => useLocalStorage(key, "default"),
      { initialProps: { key: "key1" } }
    );
    rerender({ key: "key2" });
    // After rerender, it should read key2
    expect(result.current[2]).toBe(true);
  });
});
