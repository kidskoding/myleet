from solution import maximum_invitations


def test_maximum_invitations_mutual_pair_with_follower():
    assert maximum_invitations([2, 2, 1, 2]) == 3


def test_maximum_invitations_full_cycle():
    assert maximum_invitations([1, 2, 0]) == 3


def test_maximum_invitations_cycle_with_tail_left_out():
    assert maximum_invitations([3, 0, 1, 4, 1]) == 4


def test_maximum_invitations_two_mutual_pairs_share_table():
    assert maximum_invitations([1, 0, 3, 2]) == 4


def test_maximum_invitations_long_chain_into_pair():
    assert maximum_invitations([1, 0, 1, 2, 3]) == 5


def test_maximum_invitations_pair_groups_beat_cycle():
    assert maximum_invitations([1, 0, 0, 2, 1, 4, 7, 8, 9, 6, 7, 10, 8]) == 6
