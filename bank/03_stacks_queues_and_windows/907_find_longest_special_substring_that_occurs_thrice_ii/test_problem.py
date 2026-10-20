from solution import maximum_length


def test_maximum_length_one_long_run():
    assert maximum_length("aaaa") == 2


def test_maximum_length_no_repeats():
    assert maximum_length("abcdef") == -1


def test_maximum_length_single_letters_across_runs():
    assert maximum_length("abcaba") == 1


def test_maximum_length_minimum_length_string():
    assert maximum_length("aaa") == 1


def test_maximum_length_two_runs_combine():
    assert maximum_length("aaabaa") == 2


def test_maximum_length_three_equal_runs():
    assert maximum_length("aabaabaa") == 2
