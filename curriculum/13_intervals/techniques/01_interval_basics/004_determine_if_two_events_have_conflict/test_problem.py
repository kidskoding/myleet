from solution import have_conflict


def test_have_conflict_touching_at_boundary():
    assert have_conflict(["01:15", "02:00"], ["02:00", "03:00"]) is True


def test_have_conflict_overlapping():
    assert have_conflict(["01:00", "02:00"], ["01:20", "03:00"]) is True


def test_have_conflict_disjoint():
    assert have_conflict(["10:00", "11:00"], ["14:00", "15:00"]) is False
