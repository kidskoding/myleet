from solution import max_number_of_balloons


def test_max_number_of_balloons_one():
    assert max_number_of_balloons("nlaebolko") == 1


def test_max_number_of_balloons_two():
    assert max_number_of_balloons("loonbalxballpoon") == 2


def test_max_number_of_balloons_none():
    assert max_number_of_balloons("leetcode") == 0


def test_max_number_of_balloons_single_l_and_o():
    assert max_number_of_balloons("balon") == 0


def test_max_number_of_balloons_exact_twice():
    assert max_number_of_balloons("balloonballoon") == 2
