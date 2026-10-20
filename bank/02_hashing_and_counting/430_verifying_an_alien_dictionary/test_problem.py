from solution import is_alien_sorted


def test_is_alien_sorted_true():
    assert is_alien_sorted(["hello", "leetcode"], "hlabcdefgijkmnopqrstuvwxyz") is True


def test_is_alien_sorted_false_on_letter():
    assert is_alien_sorted(["word", "world", "row"], "worldabcefghijkmnpqstuvxyz") is False


def test_is_alien_sorted_prefix_rule():
    assert is_alien_sorted(["apple", "app"], "abcdefghijklmnopqrstuvwxyz") is False
    assert is_alien_sorted(["app", "apple"], "abcdefghijklmnopqrstuvwxyz") is True


def test_is_alien_sorted_single_word():
    assert is_alien_sorted(["z"], "abcdefghijklmnopqrstuvwxyz") is True


def test_is_alien_sorted_duplicates_and_reverse_order():
    order = "zyxwvutsrqponmlkjihgfedcba"
    assert is_alien_sorted(["b", "b", "a"], order) is True
    assert is_alien_sorted(["a", "b"], order) is False
