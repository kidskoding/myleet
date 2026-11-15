use super::{Outcome, TestResult};

fn first_line(s: &str) -> String {
    s.trim().split('\n').next().unwrap_or_default().to_string()
}

/// Direct character data only, like Go's `xml:",chardata"`.
fn chardata(node: roxmltree::Node) -> String {
    node.children()
        .filter(|c| c.is_text())
        .filter_map(|c| c.text())
        .collect()
}

pub fn parse_junit(data: &str) -> Result<Vec<TestResult>, String> {
    let doc = roxmltree::Document::parse(data).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    walk(doc.root_element(), &mut out);
    Ok(out)
}

fn walk(suite: roxmltree::Node, out: &mut Vec<TestResult>) {
    for case in suite.children().filter(|c| c.has_tag_name("testcase")) {
        // Go keeps the last element when one repeats.
        let child = |tag: &str| case.children().rfind(|c| c.has_tag_name(tag));
        let mut tr = TestResult {
            name: case.attribute("name").unwrap_or_default().to_string(),
            outcome: Outcome::Passed,
            message: String::new(),
            detail: String::new(),
        };
        let message = |n: roxmltree::Node| first_line(n.attribute("message").unwrap_or_default());
        if let Some(f) = child("failure") {
            tr.outcome = Outcome::Failed;
            tr.message = message(f);
            tr.detail = chardata(f).trim().to_string();
        } else if let Some(e) = child("error") {
            tr.outcome = Outcome::Errored;
            tr.message = message(e);
            tr.detail = chardata(e).trim().to_string();
        } else if let Some(s) = child("skipped") {
            tr.outcome = Outcome::Skipped;
            tr.message = message(s);
        }
        out.push(tr);
    }
    for child in suite.children().filter(|c| c.has_tag_name("testsuite")) {
        walk(child, out);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tr(name: &str, outcome: Outcome, message: &str, detail: &str) -> TestResult {
        TestResult {
            name: name.into(),
            outcome,
            message: message.into(),
            detail: detail.into(),
        }
    }

    #[test]
    fn parse() {
        let xml = r#"<?xml version="1.0" encoding="utf-8"?><testsuites><testsuite name="pytest" errors="1" failures="1" tests="3">
<testcase classname="test_problem" name="test_ok" time="0.001" />
<testcase classname="test_problem" name="test_bad" time="0.001"><failure message="assert 1 == 2&#10;more">long
detail</failure></testcase>
<testcase classname="test_problem" name="test_err" time="0.001"><error message="NameError: x">trace</error></testcase>
</testsuite></testsuites>"#;
        let got = parse_junit(xml).unwrap();
        let want = vec![
            tr("test_ok", Outcome::Passed, "", ""),
            tr("test_bad", Outcome::Failed, "assert 1 == 2", "long\ndetail"),
            tr("test_err", Outcome::Errored, "NameError: x", "trace"),
        ];
        assert_eq!(got, want);
    }

    #[test]
    fn skipped_and_bare_testsuite_root() {
        let xml =
            r#"<testsuite><testcase name="t"><skipped message="later"/></testcase></testsuite>"#;
        assert_eq!(
            parse_junit(xml).unwrap(),
            vec![tr("t", Outcome::Skipped, "later", "")]
        );
    }

    #[test]
    fn bad_xml_is_an_error() {
        assert!(parse_junit("<testsuite>").is_err());
    }
}
