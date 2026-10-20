from solution import MedianFinder


def test_median_finder_odd_count():
    finder = MedianFinder()
    finder.add_num(1)
    finder.add_num(2)
    finder.add_num(3)
    assert finder.find_median() == 2


def test_median_finder_even_count():
    finder = MedianFinder()
    finder.add_num(1)
    finder.add_num(2)
    assert finder.find_median() == 1.5


def test_median_finder_single_value():
    finder = MedianFinder()
    finder.add_num(5)
    assert finder.find_median() == 5
