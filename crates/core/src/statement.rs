//! LeetCode statement HTML, tidied before it becomes markdown (the CLI and the Worker
//! both call this). Example values read as code: `Input: nums = [1,2]` instead of plain
//! lines that run together once rendered.

const IO_SPAN: &str = "<span class=\"example-io\">";

/// Rewrites example blocks so each labelled line is its own paragraph and the Input and
/// Output values are inline code. Handles both of LeetCode's shapes: a `<pre>` of
/// `<strong>Label:</strong> value` lines, and `<span class="example-io">` values.
pub fn examples_as_code(html: &str) -> String {
    let html = io_spans_as_code(html);
    let mut out = String::with_capacity(html.len());
    let mut rest = html.as_str();
    while let Some(i) = rest.find("<pre>") {
        let after = &rest[i + "<pre>".len()..];
        let Some(j) = after.find("</pre>") else {
            break;
        };
        out.push_str(&rest[..i]);
        let inner = &after[..j];
        // A <pre> without labels (ASCII art, a grid) stays as it is.
        match labelled(inner) {
            Some(ps) => out.push_str(&ps),
            None => {
                out.push_str("<pre>");
                out.push_str(inner);
                out.push_str("</pre>");
            }
        }
        rest = &after[j + "</pre>".len()..];
    }
    out.push_str(rest);
    out
}

fn io_spans_as_code(html: &str) -> String {
    let mut out = String::with_capacity(html.len());
    let mut rest = html;
    while let Some(i) = rest.find(IO_SPAN) {
        let after = &rest[i + IO_SPAN.len()..];
        let Some(j) = after.find("</span>") else {
            break;
        };
        out.push_str(&rest[..i]);
        out.push_str("<code>");
        out.push_str(strip_tags(&after[..j]).trim());
        out.push_str("</code>");
        rest = &after[j + "</span>".len()..];
    }
    out.push_str(rest);
    out
}

/// One paragraph per `<strong>Label:</strong>` line; continuation lines join the one
/// before. `None` when the block has no labels.
fn labelled(inner: &str) -> Option<String> {
    let mut paras: Vec<(bool, String, String)> = Vec::new();
    for line in inner.lines().map(str::trim).filter(|l| !l.is_empty()) {
        let label = line
            .strip_prefix("<strong>")
            .and_then(|l| l.split_once("</strong>"));
        match label {
            Some((name, value)) if name.ends_with(':') => {
                let code = matches!(name, "Input:" | "Output:");
                paras.push((code, name.to_string(), value.trim().to_string()));
            }
            _ => {
                let (_, _, value) = paras.last_mut()?;
                value.push(' ');
                value.push_str(line);
            }
        }
    }
    if paras.is_empty() {
        return None;
    }
    Some(
        paras
            .into_iter()
            .map(|(code, name, value)| {
                if code {
                    format!(
                        "<p><strong>{name}</strong> <code>{}</code></p>",
                        strip_tags(&value)
                    )
                } else {
                    format!("<p><strong>{name}</strong> {value}</p>")
                }
            })
            .collect(),
    )
}

fn strip_tags(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut in_tag = false;
    for c in s.chars() {
        match c {
            '<' => in_tag = true,
            '>' if in_tag => in_tag = false,
            _ if !in_tag => out.push(c),
            _ => {}
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pre_examples_become_labelled_paragraphs_with_code_values() {
        let html = "<pre>\n<strong>Input:</strong> beginWord = &quot;hit&quot;, wordList = [&quot;hot&quot;]\n<strong>Output:</strong> 5\n<strong>Explanation:</strong> One sequence is &quot;hit&quot; -&gt; &quot;hot&quot;,\nwhich is 2 words long.\n</pre>";
        assert_eq!(
            examples_as_code(html),
            "<p><strong>Input:</strong> <code>beginWord = &quot;hit&quot;, wordList = [&quot;hot&quot;]</code></p>\
             <p><strong>Output:</strong> <code>5</code></p>\
             <p><strong>Explanation:</strong> One sequence is &quot;hit&quot; -&gt; &quot;hot&quot;, which is 2 words long.</p>"
        );
    }

    #[test]
    fn example_io_spans_become_code_and_unlabelled_pre_stays() {
        let html = "<p><strong>Input:</strong> <span class=\"example-io\">nums = [1,2]</span></p><pre>  1\n / \\\n2   3</pre>";
        assert_eq!(
            examples_as_code(html),
            "<p><strong>Input:</strong> <code>nums = [1,2]</code></p><pre>  1\n / \\\n2   3</pre>"
        );
    }
}
