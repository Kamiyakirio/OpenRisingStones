/** Ship source attribution with the application. */
import license from "../../../../licenses/ffxiv-gearing/LICENSE.txt?raw";
import manifest from "../data/generated/manifest.json";
export function About() {
  return (
    <footer className="gearing-about">
      配装数据 {manifest.gameVersion}
      <details>
        <summary>来源与许可</summary>
        <a
          href="https://github.com/Kamiyakirio/ffxiv-gearing"
          target="_blank"
          rel="noreferrer"
        >
          ffxiv-gearing
        </a>
        <pre>{license}</pre>
        <p>FINAL FANTASY XIV © SQUARE ENIX CO., LTD. All Rights Reserved.</p>
      </details>
    </footer>
  );
}
