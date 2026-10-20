from solution import number_of_ways


def test_number_of_ways_example_one():
    assert number_of_ways("abcd", "cdab", 2) == 2


def test_number_of_ways_periodic_string():
    assert number_of_ways("ababab", "ababab", 1) == 2


def test_number_of_ways_one_swap():
    assert number_of_ways("ab", "ba", 1) == 1


def test_number_of_ways_cannot_stay_put_in_one_step():
    assert number_of_ways("ab", "ab", 1) == 0


def test_number_of_ways_not_a_rotation():
    assert number_of_ways("abc", "abd", 3) == 0


def test_number_of_ways_back_to_start():
    assert number_of_ways("abc", "abc", 2) == 2


def test_number_of_ways_huge_k():
    assert number_of_ways("abcd", "cdab", 10**15) == 117151711
