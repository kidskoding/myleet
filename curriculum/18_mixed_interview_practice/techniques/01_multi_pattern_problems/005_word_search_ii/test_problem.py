from solution import find_words


def test_find_words_normal():
    board = [
        ["o", "a", "a", "n"],
        ["e", "t", "a", "e"],
        ["i", "h", "k", "r"],
        ["i", "f", "l", "v"],
    ]
    assert sorted(find_words(board, ["oath", "pea", "eat", "rain"])) == ["eat", "oath"]


def test_find_words_no_match():
    assert find_words([["a", "b"], ["c", "d"]], ["abcb"]) == []
