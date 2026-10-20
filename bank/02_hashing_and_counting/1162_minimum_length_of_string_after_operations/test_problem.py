from solution import minimum_length


def test_minimum_length_mixed_letters():
    assert minimum_length("abaacbcbb") == 5


def test_minimum_length_pair_cannot_shrink():
    assert minimum_length("aa") == 2


def test_minimum_length_single():
    assert minimum_length("a") == 1


def test_minimum_length_odd_count_drops_to_one():
    assert minimum_length("aaa") == 1
    assert minimum_length("aaaaa") == 1


def test_minimum_length_even_count_drops_to_two():
    assert minimum_length("aaaa") == 2


def test_minimum_length_three_of_each():
    assert minimum_length("abcabcabc") == 3
