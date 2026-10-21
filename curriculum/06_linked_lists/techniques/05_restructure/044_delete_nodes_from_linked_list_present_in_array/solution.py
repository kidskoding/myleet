from list_node import ListNode


def modified_list(nums: list[int], head: ListNode | None) -> ListNode | None:
    # Problem 44: Delete Nodes From Linked List Present in Array
    # Time: O(n + k)
    # Space: O(k)

    banned = set(nums)
    dummy = ListNode(0, head)
    prev = dummy
    curr = head

    while curr is not None:
        if curr.val in banned:
            prev.next = curr.next
        else:
            prev = curr
        curr = curr.next

    return dummy.next
