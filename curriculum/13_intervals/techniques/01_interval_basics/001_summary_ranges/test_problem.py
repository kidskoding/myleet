from solution import summary_ranges


def test_summary_ranges_empty():
    assert summary_ranges([]) == []


def test_summary_ranges_single():
    assert summary_ranges([5]) == ["5"]


def test_summary_ranges_normal():
    assert summary_ranges([0, 1, 2, 4, 5, 7]) == ["0->2", "4->5", "7"]


def test_summary_ranges_all_consecutive():
    assert summary_ranges([1, 2, 3, 4]) == ["1->4"]
