from solution import make_string_good


def test_make_string_good_delete_one():
    assert make_string_good("acab") == 1


def test_make_string_good_already_good():
    assert make_string_good("wddw") == 0
    assert make_string_good("zzz") == 0


def test_make_string_good_shift_and_insert():
    assert make_string_good("aaabc") == 2


def test_make_string_good_example_from_list():
    assert make_string_good("aaabbc") == 2


def test_make_string_good_distinct_letters():
    assert make_string_good("abc") == 0


def test_make_string_good_shift_into_short_neighbour():
    assert make_string_good("aaaabbbbccd") == 3
