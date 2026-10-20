from solution import minimum_buckets


def test_minimum_buckets_two_hamsters_apart():
    assert minimum_buckets("H..H") == 2


def test_minimum_buckets_shared_bucket():
    assert minimum_buckets(".H.H.") == 1


def test_minimum_buckets_impossible_middle():
    assert minimum_buckets(".HHH.") == -1


def test_minimum_buckets_lone_hamster():
    assert minimum_buckets("H") == -1


def test_minimum_buckets_no_hamsters():
    assert minimum_buckets("...") == 0


def test_minimum_buckets_left_fallback():
    assert minimum_buckets(".HH.") == 2
