from solution import max_freq


def test_max_freq_example_one():
    assert max_freq("aababcaab", 2, 3, 4) == 2


def test_max_freq_overlapping_occurrences():
    assert max_freq("aaaa", 1, 3, 3) == 2


def test_max_freq_none_valid():
    assert max_freq("abcde", 2, 3, 3) == 0


def test_max_freq_single_letter_windows():
    assert max_freq("abcabc", 1, 1, 3) == 2


def test_max_freq_ignores_max_size():
    assert max_freq("abcabcabc", 3, 3, 9) == 3
