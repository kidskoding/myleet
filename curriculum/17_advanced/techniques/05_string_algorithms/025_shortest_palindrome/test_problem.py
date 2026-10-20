from solution import shortest_palindrome


def test_shortest_palindrome_normal():
    assert shortest_palindrome("aacecaaa") == "aaacecaaa"


def test_shortest_palindrome_already_palindrome():
    assert shortest_palindrome("aba") == "aba"


def test_shortest_palindrome_empty():
    assert shortest_palindrome("") == ""
