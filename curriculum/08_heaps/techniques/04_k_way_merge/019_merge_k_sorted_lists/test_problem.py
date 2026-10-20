from solution import ListNode, merge_k_lists


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_merge_k_lists_normal():
    lists = [build_list([1, 4, 5]), build_list([1, 3, 4]), build_list([2, 6])]
    assert to_list(merge_k_lists(lists)) == [1, 1, 2, 3, 4, 4, 5, 6]


def test_merge_k_lists_empty_input():
    assert merge_k_lists([]) is None


def test_merge_k_lists_with_empty_lists():
    assert to_list(merge_k_lists([None, build_list([1]), None])) == [1]
