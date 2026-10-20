from solution import num_ways


def test_num_ways_three_posts_two_colors():
    assert num_ways(3, 2) == 6


def test_num_ways_single_post_single_color():
    assert num_ways(1, 1) == 1


def test_num_ways_seven_posts_two_colors():
    assert num_ways(7, 2) == 42


def test_num_ways_two_posts_one_color():
    assert num_ways(2, 1) == 1


def test_num_ways_three_posts_one_color():
    assert num_ways(3, 1) == 0


def test_num_ways_two_posts_three_colors():
    assert num_ways(2, 3) == 9


def test_num_ways_four_posts_three_colors():
    assert num_ways(4, 3) == 66
