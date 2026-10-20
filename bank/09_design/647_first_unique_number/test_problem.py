from solution import FirstUnique


def test_first_unique_example_one():
    fu = FirstUnique([2, 3, 5])
    assert fu.show_first_unique() == 2
    fu.add(5)
    assert fu.show_first_unique() == 2
    fu.add(2)
    assert fu.show_first_unique() == 3
    fu.add(3)
    assert fu.show_first_unique() == -1


def test_first_unique_all_duplicates_then_new():
    fu = FirstUnique([7, 7, 7, 7, 7, 7])
    assert fu.show_first_unique() == -1
    fu.add(7)
    fu.add(3)
    fu.add(3)
    fu.add(7)
    fu.add(17)
    assert fu.show_first_unique() == 17


def test_first_unique_single_then_duplicate():
    fu = FirstUnique([809])
    assert fu.show_first_unique() == 809
    fu.add(809)
    assert fu.show_first_unique() == -1


def test_first_unique_order_is_first_arrival():
    fu = FirstUnique([4, 1, 4])
    assert fu.show_first_unique() == 1
    fu.add(9)
    fu.add(1)
    assert fu.show_first_unique() == 9


def test_first_unique_repeated_queries_stable():
    fu = FirstUnique([1, 2])
    assert fu.show_first_unique() == 1
    assert fu.show_first_unique() == 1
