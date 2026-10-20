import random

from solution import Skiplist


def test_skiplist_basic_operations():
    skiplist = Skiplist()
    skiplist.add(1)
    skiplist.add(2)
    skiplist.add(3)
    assert skiplist.search(0) is False
    skiplist.add(4)
    assert skiplist.search(1) is True
    assert skiplist.erase(0) is False
    assert skiplist.erase(1) is True
    assert skiplist.search(1) is False


def test_skiplist_empty():
    skiplist = Skiplist()
    assert skiplist.search(3) is False
    assert skiplist.erase(3) is False


def test_skiplist_duplicates_erase_one_at_a_time():
    skiplist = Skiplist()
    skiplist.add(5)
    skiplist.add(5)
    assert skiplist.erase(5) is True
    assert skiplist.search(5) is True
    assert skiplist.erase(5) is True
    assert skiplist.search(5) is False
    assert skiplist.erase(5) is False


def test_skiplist_many_values():
    rng = random.Random(7)
    values = list(range(200))
    rng.shuffle(values)
    skiplist = Skiplist()
    for value in values:
        skiplist.add(value)
    for value in range(0, 200, 2):
        assert skiplist.erase(value) is True
    for value in range(200):
        assert skiplist.search(value) is (value % 2 == 1)
    assert skiplist.search(-1) is False
    assert skiplist.search(200) is False


def test_skiplist_zero_and_reinsert():
    skiplist = Skiplist()
    skiplist.add(0)
    assert skiplist.search(0) is True
    assert skiplist.erase(0) is True
    assert skiplist.search(0) is False
    skiplist.add(0)
    assert skiplist.search(0) is True
