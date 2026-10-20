from solution import longest_continuous_substring


def test_longest_continuous_substring_example_one():
    assert longest_continuous_substring("abacaba") == 2


def test_longest_continuous_substring_whole_string():
    assert longest_continuous_substring("abcde") == 5


def test_longest_continuous_substring_single():
    assert longest_continuous_substring("a") == 1


def test_longest_continuous_substring_no_wraparound():
    assert longest_continuous_substring("zab") == 2


def test_longest_continuous_substring_repeated_letters():
    assert longest_continuous_substring("aabbcc") == 2


def test_longest_continuous_substring_run_at_end():
    assert longest_continuous_substring("xyzabcd") == 4
