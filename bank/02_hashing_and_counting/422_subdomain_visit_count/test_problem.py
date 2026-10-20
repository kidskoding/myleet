from solution import subdomain_visits


def test_subdomain_visits_single():
    assert sorted(subdomain_visits(["9001 discuss.leetcode.com"])) == sorted(
        ["9001 discuss.leetcode.com", "9001 leetcode.com", "9001 com"]
    )


def test_subdomain_visits_multiple():
    result = subdomain_visits(["900 google.mail.com", "50 yahoo.com", "1 intel.mail.com", "5 wiki.org"])
    assert sorted(result) == sorted(
        ["901 mail.com", "50 yahoo.com", "900 google.mail.com", "5 wiki.org", "5 org", "1 intel.mail.com", "951 com"]
    )


def test_subdomain_visits_top_level_only():
    assert subdomain_visits(["3 org"]) == ["3 org"]


def test_subdomain_visits_duplicate_entries_merge():
    assert sorted(subdomain_visits(["2 a.com", "3 a.com"])) == ["5 a.com", "5 com"]
