from solution import max_repeating


def test_max_repeating_twice():
    assert max_repeating("ababc", "ab") == 2


def test_max_repeating_once():
    assert max_repeating("ababc", "ba") == 1


def test_max_repeating_absent():
    assert max_repeating("ababc", "ac") == 0


def test_max_repeating_word_equals_sequence():
    assert max_repeating("abc", "abc") == 1


def test_max_repeating_word_longer_than_sequence():
    assert max_repeating("ab", "abab") == 0


def test_max_repeating_best_run_not_first_match():
    assert max_repeating("aaabaaaabaaabaaaabaaaabaaaabaaaaba", "aaaba") == 5
