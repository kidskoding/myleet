//! Bakes the company slugs (`playlists/NNN_<slug>.toml`, as the web's `companySlug`) into
//! the Worker, so "I was asked this" reports only name companies the site has.

use std::{env, fs, path::Path};

fn main() {
    let dir = Path::new("../playlists");
    println!("cargo:rerun-if-changed={}", dir.display());
    let mut slugs: Vec<String> = fs::read_dir(dir)
        .expect("read ../playlists")
        .filter_map(|e| {
            let name = e.ok()?.file_name().into_string().ok()?;
            let stem = name.strip_suffix(".toml")?;
            let slug = stem.trim_start_matches(|c: char| c.is_ascii_digit());
            Some(slug.strip_prefix('_').unwrap_or(slug).to_string())
        })
        .collect();
    slugs.sort();
    slugs.dedup();
    let out = Path::new(&env::var("OUT_DIR").unwrap()).join("companies.rs");
    fs::write(out, format!("pub const COMPANIES: &[&str] = &{slugs:?};\n")).unwrap();
}
