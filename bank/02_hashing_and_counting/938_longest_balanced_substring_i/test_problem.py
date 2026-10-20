from solution import longest_balanced


def test_longest_balanced_two_letters_twice():
    assert longest_balanced("abbac") == 4


def test_longest_balanced_distinct_window():
    assert longest_balanced("zzabccy") == 4


def test_longest_balanced_short():
    assert longest_balanced("aba") == 2


def test_longest_balanced_single_char():
    assert longest_balanced("q") == 1


def test_longest_balanced_one_letter_run():
    assert longest_balanced("aaaa") == 4


def test_longest_balanced_whole_string():
    assert longest_balanced("aabbcc") == 6
