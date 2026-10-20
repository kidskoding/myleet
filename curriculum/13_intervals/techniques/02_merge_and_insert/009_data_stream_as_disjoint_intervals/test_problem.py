from solution import SummaryRanges


def test_summary_ranges_stream_single_value():
    ranges = SummaryRanges()
    ranges.add_num(1)
    assert ranges.get_intervals() == [[1, 1]]


def test_summary_ranges_stream_merges_consecutive():
    ranges = SummaryRanges()
    for value in (1, 3, 7, 2, 6):
        ranges.add_num(value)
    assert ranges.get_intervals() == [[1, 3], [6, 7]]


def test_summary_ranges_stream_bridges_gap():
    ranges = SummaryRanges()
    for value in (1, 3, 7, 2, 6):
        ranges.add_num(value)
    ranges.add_num(4)
    assert ranges.get_intervals() == [[1, 4], [6, 7]]
