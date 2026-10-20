from solution import palindrome_pairs


def test_palindrome_pairs_normal():
    words = ["abcd", "dcba", "lls", "s", "sssll"]
    result = palindrome_pairs(words)
    expected_pairs = {(0, 1), (1, 0), (2, 4), (3, 2)}
    assert {tuple(pair) for pair in result} == expected_pairs


def test_palindrome_pairs_no_matches():
    assert palindrome_pairs(["abc", "def"]) == []


def test_palindrome_pairs_empty_string_pairs_with_palindromes():
    words = ["bat", "tab", "cat", ""]
    result = palindrome_pairs(words)
    expected_pairs = {(0, 1), (1, 0)}
    assert {tuple(pair) for pair in result} == expected_pairs
