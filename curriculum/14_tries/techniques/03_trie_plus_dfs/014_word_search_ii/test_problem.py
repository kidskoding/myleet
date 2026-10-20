from solution import find_words


def test_find_words_normal_board():
    board = [
        ["o", "a", "a", "n"],
        ["e", "t", "a", "e"],
        ["i", "h", "k", "r"],
        ["i", "f", "l", "v"],
    ]
    words = ["oath", "pea", "eat", "rain"]
    assert set(find_words(board, words)) == {"oath", "eat"}


def test_find_words_no_matches():
    board = [["a", "b"], ["c", "d"]]
    words = ["xyz"]
    assert find_words(board, words) == []


def test_find_words_single_cell_board():
    board = [["a"]]
    words = ["a", "b"]
    assert find_words(board, words) == ["a"]
