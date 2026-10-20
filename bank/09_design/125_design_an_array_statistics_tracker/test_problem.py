from solution import StatisticsTracker


def test_statistics_tracker_even_count():
    tracker = StatisticsTracker()
    for x in (4, 4, 2, 3):
        tracker.add_number(x)
    assert tracker.get_mean() == 3
    assert tracker.get_median() == 4
    assert tracker.get_mode() == 4


def test_statistics_tracker_remove_oldest():
    tracker = StatisticsTracker()
    for x in (4, 4, 2, 3):
        tracker.add_number(x)
    tracker.remove_first_added_number()
    assert tracker.get_mean() == 3
    assert tracker.get_median() == 3
    assert tracker.get_mode() == 2


def test_statistics_tracker_single_value():
    tracker = StatisticsTracker()
    tracker.add_number(7)
    assert tracker.get_mean() == 7
    assert tracker.get_median() == 7
    assert tracker.get_mode() == 7


def test_statistics_tracker_mode_tie_takes_smallest():
    tracker = StatisticsTracker()
    for x in (5, 1, 5, 1):
        tracker.add_number(x)
    assert tracker.get_mode() == 1


def test_statistics_tracker_median_after_removals():
    tracker = StatisticsTracker()
    for x in (1, 2, 3, 4, 5):
        tracker.add_number(x)
    tracker.remove_first_added_number()
    tracker.remove_first_added_number()
    assert tracker.get_median() == 4
    assert tracker.get_mean() == 4
    tracker.remove_first_added_number()
    assert tracker.get_median() == 5
    assert tracker.get_mean() == 4


def test_statistics_tracker_mode_changes_after_removal():
    tracker = StatisticsTracker()
    for x in (9, 9, 3, 3, 3):
        tracker.add_number(x)
    assert tracker.get_mode() == 3
    tracker.remove_first_added_number()
    tracker.remove_first_added_number()
    tracker.add_number(9)
    assert tracker.get_mode() == 3
    tracker.remove_first_added_number()
    assert tracker.get_mode() == 3
    tracker.remove_first_added_number()
    assert tracker.get_mode() == 3
    tracker.remove_first_added_number()
    assert tracker.get_mode() == 9
