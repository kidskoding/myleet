from solution import TweetCounts


def test_tweet_counts_example():
    tc = TweetCounts()
    tc.record_tweet("tweet3", 0)
    tc.record_tweet("tweet3", 60)
    tc.record_tweet("tweet3", 10)
    assert tc.get_tweet_counts_per_frequency("minute", "tweet3", 0, 59) == [2]
    assert tc.get_tweet_counts_per_frequency("minute", "tweet3", 0, 60) == [2, 1]
    tc.record_tweet("tweet3", 120)
    assert tc.get_tweet_counts_per_frequency("hour", "tweet3", 0, 210) == [4]


def test_tweet_counts_unknown_name_gives_zeros():
    tc = TweetCounts()
    tc.record_tweet("a", 5)
    assert tc.get_tweet_counts_per_frequency("minute", "b", 0, 119) == [0, 0]


def test_tweet_counts_day_buckets():
    tc = TweetCounts()
    for t in (0, 86399, 86400, 200000):
        tc.record_tweet("x", t)
    assert tc.get_tweet_counts_per_frequency("day", "x", 0, 200000) == [2, 1, 1]


def test_tweet_counts_offset_start_and_duplicates():
    tc = TweetCounts()
    for t in (10, 10, 69, 70, 130):
        tc.record_tweet("y", t)
    assert tc.get_tweet_counts_per_frequency("minute", "y", 10, 130) == [3, 1, 1]
    assert tc.get_tweet_counts_per_frequency("minute", "y", 11, 69) == [1]


def test_tweet_counts_out_of_range_ignored():
    tc = TweetCounts()
    for t in (1, 100, 5000):
        tc.record_tweet("z", t)
    assert tc.get_tweet_counts_per_frequency("hour", "z", 50, 3649) == [1]
