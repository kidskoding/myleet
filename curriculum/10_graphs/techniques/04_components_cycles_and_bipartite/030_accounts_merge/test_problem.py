from solution import accounts_merge


def test_accounts_merge_normal_case():
    accounts = [
        ["John", "johnsmith@mail.com", "john_newyork@mail.com"],
        ["John", "johnsmith@mail.com", "john00@mail.com"],
        ["Mary", "mary@mail.com"],
        ["John", "johnnybravo@mail.com"],
    ]
    expected = [
        ["John", "john00@mail.com", "john_newyork@mail.com", "johnsmith@mail.com"],
        ["Mary", "mary@mail.com"],
        ["John", "johnnybravo@mail.com"],
    ]

    result = accounts_merge(accounts)
    normalized = sorted([acc[0]] + sorted(acc[1:]) for acc in result)
    expected_normalized = sorted([acc[0]] + sorted(acc[1:]) for acc in expected)

    assert normalized == expected_normalized


def test_accounts_merge_no_shared_emails():
    accounts = [["A", "a@mail.com"], ["B", "b@mail.com"]]

    result = accounts_merge(accounts)

    assert sorted(result) == sorted(accounts)
