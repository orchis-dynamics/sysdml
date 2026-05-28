import { describe, it, expect } from "vitest";
import { formatSource } from "../../src/features/formatting.js";

describe("formatSource", () => {
  it("returns null for source with parse errors", () => {
    expect(formatSource("sfd test\nstock {")).toBeNull();
  });

  it("separates top-level declarations with a blank line", () => {
    const source = `sfd test
time { start: 0
  end: 10
  step: 1
}
stock population { init: 100 }
aux birth_rate = 0.02
`;
    const result = formatSource(source);
    expect(result).not.toBeNull();
    expect(result).toContain("\n\n");
  });

  it("formats stock block with 2-space indent and canonical init key", () => {
    const result = formatSource(
      "sfd m\ntime{start:0\nend:10\nstep:1}\nstock s{init:100}",
    );
    expect(result).not.toBeNull();
    expect(result).toContain("stock s {\n  init: 100\n}");
  });

  it("formats time block with canonical property order: start end step", () => {
    const result = formatSource(
      "sfd m\ntime{step:1\nend:10\nstart:0}\nstock s{init:0}",
    );
    expect(result).not.toBeNull();
    const timeBlock = result!.substring(
      result!.indexOf("time {"),
      result!.indexOf("}") + 1,
    );
    const startIdx = timeBlock.indexOf("start");
    const endIdx = timeBlock.indexOf("end");
    const stepIdx = timeBlock.indexOf("step");
    expect(startIdx).toBeLessThan(endIdx);
    expect(endIdx).toBeLessThan(stepIdx);
  });

  it("formats flow block with canonical property order: from to rate", () => {
    const result = formatSource(
      "sfd m\ntime{start:0\nend:10\nstep:1}\nstock s{init:0}\nflow f{rate:1\nto:s\nfrom:null}",
    );
    expect(result).not.toBeNull();
    const fromIdx = result!.indexOf("from:");
    const toIdx = result!.indexOf("to:");
    const rateIdx = result!.indexOf("rate:");
    expect(fromIdx).toBeLessThan(toIdx);
    expect(toIdx).toBeLessThan(rateIdx);
  });

  it("formats aux expression with spaces around operator", () => {
    const result = formatSource(
      "sfd m\ntime{start:0\nend:10\nstep:1}\nstock s{init:0}\naux x=s+1",
    );
    expect(result).not.toBeNull();
    expect(result).toContain("aux x = s + 1");
  });

  it("formats connection declarations as-is", () => {
    const result = formatSource(
      "sfd m\ntime{start:0\nend:10\nstep:1}\nstock s{init:0}\naux x=1\ns->+x",
    );
    expect(result).not.toBeNull();
    expect(result).toContain("s ->+ x");
  });
});

describe("layout formatting", () => {
  it("preserves position in stock block", () => {
    const result = formatSource(
      "sfd m\ntime{start:0\nend:10\nstep:1}\nstock s{init:100\nposition:{x:400,y:300}}",
    );
    expect(result).not.toBeNull();
    expect(result).toContain("stock s {\n  init: 100\n  position: { x: 400, y: 300 }\n}");
  });

  it("preserves position in flow block", () => {
    const result = formatSource(
      "sfd m\ntime{start:0\nend:10\nstep:1}\nstock s{init:0}\nflow f{from:null\nto:s\nrate:0.01\nposition:{x:200,y:300}}",
    );
    expect(result).not.toBeNull();
    expect(result).toContain("  position: { x: 200, y: 300 }");
  });

  it("preserves via in flow block", () => {
    const result = formatSource(
      "sfd m\ntime{start:0\nend:10\nstep:1}\nstock s{init:0}\nflow f{from:null\nto:s\nrate:0.01\nvia:[{x:150,y:150},{x:180,y:250}]}",
    );
    expect(result).not.toBeNull();
    expect(result).toContain("  via: [{ x: 150, y: 150 }, { x: 180, y: 250 }]");
  });

  it("preserves position in aux block form", () => {
    const result = formatSource(
      "sfd m\ntime{start:0\nend:10\nstep:1}\nstock s{init:0}\naux a=0.02{position:{x:200,y:300}}",
    );
    expect(result).not.toBeNull();
    expect(result).toContain("aux a = 0.02 { position: { x: 200, y: 300 } }");
  });


  it("formats connection with angle as block", () => {
    const result = formatSource(
      "sfd m\ntime{start:0\nend:10\nstep:1}\nstock s{init:0}\naux a=1\na->+s{angle:45}",
    );
    expect(result).not.toBeNull();
    expect(result).toContain("a ->+ s {\n  angle: 45\n}");
  });

  it("formats connection with angle and via as block", () => {
    const result = formatSource(
      "sfd m\ntime{start:0\nend:10\nstep:1}\nstock s{init:0}\naux a=1\na->+s{angle:-30\nvia:{x:150,y:80}}",
    );
    expect(result).not.toBeNull();
    expect(result).toContain("a ->+ s {\n  angle: -30\n  via: { x: 150, y: 80 }\n}");
  });

  it("layout formatting is idempotent", () => {
    const src =
      "sfd m\ntime{start:0\nend:10\nstep:1}\nstock s{init:100\nposition:{x:400,y:300}}";
    const once = formatSource(src);
    expect(once).not.toBeNull();
    expect(formatSource(once!)).toBe(once);
  });
});
