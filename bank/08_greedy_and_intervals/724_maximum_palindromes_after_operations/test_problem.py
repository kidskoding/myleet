from solution import max_palindromes_after_operations


def test_max_palindromes_after_operations_all_fixable():
    assert max_palindromes_after_operations(["abbb", "ba", "aa"]) == 3


def test_max_palindromes_after_operations_odd_center():
    assert max_palindromes_after_operations(["abc", "ab"]) == 2


def test_max_palindromes_after_operations_only_single_letter():
    assert max_palindromes_after_operations(["cd", "ef", "a"]) == 1


def test_max_palindromes_after_operations_single_word():
    assert max_palindromes_after_operations(["ab"]) == 0


def test_max_palindromes_after_operations_short_words_first():
    assert max_palindromes_after_operations(["aabbcd", "ef", "gg"]) == 2
