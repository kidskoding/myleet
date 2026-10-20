from solution import possible_string_count


def test_possible_string_count_multiple_runs():
    assert possible_string_count("abbcccc") == 5


def test_possible_string_count_no_repeats():
    assert possible_string_count("abcd") == 1


def test_possible_string_count_one_run():
    assert possible_string_count("aaaa") == 4


def test_possible_string_count_single_letter():
    assert possible_string_count("a") == 1


def test_possible_string_count_two_short_runs():
    assert possible_string_count("aabb") == 3
