from list_node import ListNode
from solution import partition


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


def test_partition_splits_around_x():
    head = build_list([1, 4, 3, 2, 5, 2])
    result = to_list(partition(head, 3))
    assert result == [1, 2, 2, 4, 3, 5]


def test_partition_all_less():
    head = build_list([1, 2])
    assert to_list(partition(head, 3)) == [1, 2]
