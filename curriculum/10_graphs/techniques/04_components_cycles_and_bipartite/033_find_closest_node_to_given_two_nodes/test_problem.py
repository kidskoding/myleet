from solution import closest_meeting_node


def test_closest_meeting_node_normal_case():
    assert closest_meeting_node([2, 2, 3, -1], 0, 1) == 2


def test_closest_meeting_node_no_meeting_node():
    assert closest_meeting_node([1, 2, -1], 0, 2) == -1
